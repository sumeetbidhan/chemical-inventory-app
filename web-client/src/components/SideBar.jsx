import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './SideBar.module.scss';

export default function SideBar({ open, onClose }) {
  const location = useLocation();
  const { user, userInfo, logout } = useAuth();

  // Use userInfo.role if available, fallback to user.role
  const userRole = userInfo?.role || user?.role || 'all_users';

  const isActive = (path) => {
    return location.pathname === path;
  };

  const canAccessAdmin = ['admin'].includes(userRole);
  const canAccessChemicals = ['admin', 'lab_staff', 'product', 'account'].includes(userRole);
  const canAccessAccount = ['admin', 'account'].includes(userRole);

  return (
    <>
      {open && <div className={styles.overlay} onClick={onClose}></div>}
      <div className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close sidebar">
          ✕
        </button>
        <nav>
          <Link 
            to="/dashboard" 
            className={`${styles.navLink} ${isActive('/dashboard') ? styles.active : ''}`}
            onClick={onClose}
          >
            📊 Dashboard
          </Link>
          {canAccessAdmin && (
            <Link 
              to="/admin" 
              className={`${styles.navLink} ${isActive('/admin') ? styles.active : ''}`}
              onClick={onClose}
            >
              👥 Admin Management
            </Link>
          )}
          {canAccessChemicals && (
            <Link 
              to="/chemicals" 
              className={`${styles.navLink} ${isActive('/chemicals') ? styles.active : ''}`}
              onClick={onClose}
            >
              🧪 Chemical Inventory
            </Link>
          )}
          {canAccessAccount && (
            <Link 
              to="/account" 
              className={`${styles.navLink} ${isActive('/account') ? styles.active : ''}`}
              onClick={onClose}
            >
              💰 Account Team
            </Link>
          )}
        </nav>
        <div className={styles.mobileLogoutWrapper}>
          <button className={styles.mobileLogoutBtn} onClick={logout}>
            🚪 Logout
          </button>
        </div>
      </div>
    </>
  );
} 