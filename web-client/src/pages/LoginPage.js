import React, { useState } from 'react';
import styles from './LoginPage.module.scss';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Mail, Smartphone } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('email'); // 'email' or 'otp'
  const [firebaseToken, setFirebaseToken] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebase_token: firebaseToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send OTP');
      
      setOtpSent(true);
      setResponse(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPLogin = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the OTP code');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone_number: phoneNumber.trim(),
          otp_code: otpCode.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'OTP login failed');
      
      setResponse(data);
      setError(null);
      
      // If login successful, you might want to redirect or update auth state
      if (data.success && data.user) {
        console.log('OTP login successful:', data.user);
        // You can add navigation logic here
        // navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
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
      <h2 style={{ color: 'var(--primary-text)' }}>Chemical Inventory Login</h2>
      
      {/* Login Method Tabs */}
      <div className={styles.loginTabs}>
        <button
          className={`${styles.tab} ${activeTab === 'email' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('email')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={16} />
            Email Login
          </span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'otp' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('otp')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Smartphone size={16} />
            OTP Login
          </span>
        </button>
      </div>

      {/* Email Login Form */}
      {activeTab === 'email' && (
        <form onSubmit={handleEmailLogin} className={styles.loginForm}>
          <label htmlFor="firebaseToken">Firebase Token</label>
          <textarea
            id="firebaseToken"
            value={firebaseToken}
            onChange={e => setFirebaseToken(e.target.value)}
            rows={4}
            className={styles.tokenInput}
            placeholder="Paste your Firebase ID token here"
            required
          />
          <button type="submit" className={styles.loginButton} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      )}

      {/* OTP Login Form */}
      {activeTab === 'otp' && (
        <form onSubmit={otpSent ? handleOTPLogin : handleSendOTP} className={styles.loginForm}>
          <label htmlFor="phoneNumber">Phone Number</label>
          <input
            id="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            className={styles.input}
            placeholder="Enter your phone number"
            disabled={otpSent}
            required
          />
          
          {otpSent && (
            <>
              <label htmlFor="otpCode">OTP Code</label>
              <input
                id="otpCode"
                type="text"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                className={styles.input}
                placeholder="Enter 6-digit OTP code"
                maxLength={6}
                required
              />
            </>
          )}
          
          <button type="submit" className={styles.loginButton} disabled={loading}>
            {loading ? (otpSent ? 'Verifying...' : 'Sending...') : (otpSent ? 'Verify OTP' : 'Send OTP')}
          </button>
          
          {otpSent && (
            <button 
              type="button" 
              onClick={() => {
                setOtpSent(false);
                setOtpCode('');
                setError(null);
              }}
              className={styles.secondaryButton}
            >
              Change Phone Number
            </button>
          )}
        </form>
      )}
      
      {error && <div className={styles.errorMsg}>{error}</div>}
      {response && (
        <div className={styles.responseBox}>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default LoginPage; 