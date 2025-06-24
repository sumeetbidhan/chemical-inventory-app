import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../firebase';
import styles from './AdminLoginPage.module.scss';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Test Firebase connection
  const testFirebaseConnection = async () => {
    setDebugInfo('Testing Firebase connection...');
    try {
      console.log('Firebase auth object:', auth);
      console.log('Firebase app:', auth.app);
      setDebugInfo('Firebase connection successful');
    } catch (err) {
      console.error('Firebase connection error:', err);
      setDebugInfo(`Firebase connection failed: ${err.message}`);
    }
  };

  // Test backend connection
  const testBackendConnection = async () => {
    setDebugInfo('Testing backend connection...');
    try {
      const response = await fetch('http://localhost:8000/health');
      const data = await response.json();
      console.log('Backend health check:', data);
      setDebugInfo(`Backend connection successful: ${data.status}`);
    } catch (err) {
      console.error('Backend connection error:', err);
      setDebugInfo(`Backend connection failed: ${err.message}`);
    }
  };

  // Email/password login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setEmailLoading(true);
    setError(null);
    setDebugInfo('Starting email login...');
    
    try {
      console.log('Attempting login with:', { email, password: '***' });
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful:', userCredential.user);
      
      setDebugInfo('Getting ID token...');
      const token = await userCredential.user.getIdToken();
      console.log('Token obtained:', token ? 'Yes' : 'No');
      
      localStorage.setItem('firebase_token', token);
      setDebugInfo('Token stored, navigating to dashboard...');
      
      // The PublicRoute component will handle the navigation automatically
      setDebugInfo('Login successful! Redirecting...');
      
    } catch (err) {
      console.error('Login error:', err);
      setDebugInfo(`Error: ${err.code} - ${err.message}`);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setEmailLoading(false);
    }
  };

  // OTP login
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone) {
      setError('Please enter a phone number');
      return;
    }
    
    setError(null);
    setOtpLoading(true);
    setDebugInfo('Setting up OTP...');
    
    try {
      // Clear any existing recaptcha
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
      
      window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', { 
        size: 'invisible' 
      }, auth);
      
      setDebugInfo('Sending OTP...');
      const confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      window.confirmationResult = confirmationResult;
      setOtpSent(true);
      setDebugInfo('OTP sent successfully!');
    } catch (err) {
      console.error('OTP send error:', err);
      setDebugInfo(`OTP Error: ${err.code} - ${err.message}`);
      setError(err.message || 'Failed to send OTP. Please check your phone number.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }
    
    setError(null);
    setOtpLoading(true);
    setDebugInfo('Verifying OTP...');
    
    try {
      const result = await window.confirmationResult.confirm(otp);
      console.log('OTP verification successful:', result.user);
      
      setDebugInfo('Getting ID token...');
      const token = await result.user.getIdToken();
      localStorage.setItem('firebase_token', token);
      setDebugInfo('Token stored, navigating to dashboard...');
      
      // The PublicRoute component will handle the navigation automatically
      setDebugInfo('Login successful! Redirecting...');
      
    } catch (err) {
      console.error('OTP verification error:', err);
      setDebugInfo(`OTP Verification Error: ${err.code} - ${err.message}`);
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setOtpLoading(false);
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
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </div>
      <div className={styles.header}>
        <h2>Welcome Back</h2>
        <p>Sign in to your Blossoms Aroma Chemical Inventory account</p>
      </div>
      
      <form onSubmit={handleEmailLogin} className={styles.loginForm}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={styles.input}
          required
          disabled={emailLoading}
          placeholder="Enter your email address"
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className={styles.input}
          required
          disabled={emailLoading}
          placeholder="Enter your password"
        />
        <button type="submit" className={styles.loginButton} disabled={emailLoading}>
          {emailLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      
      <div className={styles.divider}>or</div>
      
      <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className={styles.loginForm}>
        <label htmlFor="phone">Phone (with country code)</label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className={styles.input}
          required
          disabled={otpLoading}
          placeholder="Enter your phone number"
        />
        {otpSent && (
          <>
            <label htmlFor="otp">OTP</label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              className={styles.input}
              required
              disabled={otpLoading}
              placeholder="Enter the OTP sent to your phone"
            />
          </>
        )}
        <div id="recaptcha-container"></div>
        <button type="submit" className={styles.loginButton} disabled={otpLoading}>
          {otpLoading ? (otpSent ? 'Verifying...' : 'Sending OTP...') : (otpSent ? 'Verify OTP' : 'Send OTP')}
        </button>
      </form>
      
      {error && <div className={styles.errorMsg}>{error}</div>}
      
      <div className={styles.registerLink}>
        <p>New user? <button onClick={() => navigate('/register')} className={styles.linkBtn}>Create account here</button></p>
      </div>
      
      {debugInfo && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.5rem', 
          background: '#f0f0f0', 
          borderRadius: '4px', 
          fontSize: '12px',
          color: '#666'
        }}>
          Debug: {debugInfo}
        </div>
      )}
    </div>
  );
};

export default LoginPage; 