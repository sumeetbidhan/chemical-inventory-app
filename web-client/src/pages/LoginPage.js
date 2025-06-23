import React, { useState } from 'react';
import styles from './LoginPage.module.scss';

const LoginPage = () => {
  const [firebaseToken, setFirebaseToken] = useState('');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch('http://localhost:8000/auth/login', {
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

  return (
    <div className={styles.loginContainer}>
      <h2>Chemical Inventory Login</h2>
      <form onSubmit={handleLogin} className={styles.loginForm}>
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