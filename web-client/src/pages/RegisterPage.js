import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import styles from './RegisterPage.module.scss';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const RegisterPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
    
    // Validate first name
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      // Step 1: Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      localStorage.setItem('firebase_token', token);
      
      // Step 2: Register with backend
      const registerData = {
        uid: userCredential.user.uid,
        email: email,
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        role: 'all_users', // Default role for new registrations - limited access
        password: password // This will be ignored by backend but included for schema
      };
      
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(registerData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }
      
      const result = await response.json();
      console.log('Registration successful:', result);
      
      // Navigate to dashboard
      navigate('/dashboard');
      
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
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
          {theme === 'dark' ? <Moon /> : <Sun />}
        </button>
      </div>
      <div className={styles.header}>
        <h2>Create Account</h2>
        <p>Join Blossoms Aroma Chemical Inventory System</p>
      </div>
      
      <form onSubmit={handleRegister} className={styles.registerForm}>
        <label htmlFor="firstName">First Name *</label>
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          className={styles.input}
          required
          placeholder="Enter your first name"
        />
        <label htmlFor="lastName">Last Name</label>
        <input
          id="lastName"
          type="text"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          className={styles.input}
          placeholder="Enter your last name (optional)"
        />
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