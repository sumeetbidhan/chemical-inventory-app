import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import styles from './RegisterPage.module.scss';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      localStorage.setItem('firebase_token', token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.registerContainer}>
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
        <h2>Create Account</h2>
        <p>Join Blossoms Aroma Chemical Inventory System</p>
      </div>
      
      <form onSubmit={handleRegister} className={styles.registerForm}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={styles.input}
          required
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
          placeholder="Enter your password"
        />
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className={styles.input}
          required
          placeholder="Confirm your password"
        />
        <button type="submit" className={styles.registerButton} disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
      
      {error && <div className={styles.errorMsg}>{error}</div>}
      
      <div className={styles.loginLink}>
        <p>Already have an account? <button onClick={() => navigate('/')} className={styles.linkButton}>Login here</button></p>
      </div>
    </div>
  );
};

export default RegisterPage; 