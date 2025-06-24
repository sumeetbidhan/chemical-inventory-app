import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './NavBar.module.scss';

export default function NavBar({ onToggleTheme, theme }) {
  const { logout, user, userInfo } = useAuth();
  const navigate = useNavigate();

  // Get user role for display
  const userRole = userInfo?.role || user?.role || 'all_users';

  return (
    <nav className={styles.navbar}>
      <div className={styles.left}>
        <div className={styles.companyBrand}>
          <img src="/company_icon.png" alt="Company Icon" className={styles.companyIcon} />
          <div className={styles.companyName}>
            <span className={styles.companyTitle}>Blossoms Aroma</span>
            <span className={styles.companySubtitle}>Chemical Inventory</span>
          </div>
        </div>
      </div>
      <div className={styles.center}>
        <span className={styles.userRole}>{userRole.replace('_', ' ').toUpperCase()}</span>
      </div>
      <div className={styles.right}>
        <button onClick={onToggleTheme} className={styles.themeBtn} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
        <button onClick={logout} className={styles.logoutBtn} title="Logout">
          Logout
        </button>
      </div>
    </nav>
  );
} 