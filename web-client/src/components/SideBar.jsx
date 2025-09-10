import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  BarChart3, 
  Users, 
  FlaskConical, 
  DollarSign, 
  LogOut,
  Bell,
  Package,
  AlertTriangle,
  FileText,
  Settings
} from 'lucide-react';
import styles from './SideBar.module.scss';

export default function SideBar({ open, onClose }) {
  const location = useLocation();
  const { user, userInfo, logout } = useAuth();

  // Use userInfo.role if available, fallback to user.role
  const userRole = userInfo?.role?.name || userInfo?.role || user?.role || 'all_users';

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Role-based access control
  const isAdmin = ['admin', 'ADMIN', 1].includes(userRole) || userRole?.toLowerCase() === 'admin' || userInfo?.role_id === 1;
  const isLabStaff = ['lab', 'LAB', 'lab_staff', 'LAB_STAFF', 2].includes(userRole) || userRole?.toLowerCase() === 'lab' || userRole?.toLowerCase() === 'lab_staff' || userInfo?.role_id === 2;
  const isProductTeam = ['product', 'PRODUCT', 'product_team', 'PRODUCT_TEAM', 3].includes(userRole) || userRole?.toLowerCase() === 'product' || userRole?.toLowerCase() === 'product_team' || userInfo?.role_id === 3;
  const isAccountTeam = ['accounts', 'ACCOUNTS', 'account_team', 'ACCOUNT_TEAM', 4].includes(userRole) || userRole?.toLowerCase() === 'accounts' || userRole?.toLowerCase() === 'account_team' || userInfo?.role_id === 4;
  
  // Navigation items based on role
  const getNavigationItems = () => {
    const items = [];
    
    // Dashboard - available to all
    items.push({
      to: "/dashboard",
      icon: <BarChart3 size={20} />,
      label: "Dashboard",
      active: isActive('/dashboard')
    });
    
    if (isAdmin) {
      // Admin-only items
      items.push(
        { to: "/admin", icon: <Users size={20} />, label: "User Management", active: isActive('/admin') },
        { to: "/chemicals", icon: <FlaskConical size={20} />, label: "Chemical Inventory", active: isActive('/chemicals') },
        { to: "/stock", icon: <Package size={20} />, label: "Stock Management", active: isActive('/stock') },
        { to: "/alerts", icon: <AlertTriangle size={20} />, label: "Alerts", active: isActive('/alerts') },
        { to: "/notifications", icon: <Bell size={20} />, label: "Notifications", active: isActive('/notifications') },
        { to: "/activity-log", icon: <FileText size={20} />, label: "Activity Log", active: isActive('/activity-log') },
        { to: "/settings", icon: <Settings size={20} />, label: "Settings", active: isActive('/settings') }
      );
    } else if (isAccountTeam) {
      // Account team items
      items.push(
        { to: "/account", icon: <DollarSign size={20} />, label: "Account Management", active: isActive('/account') },
        { to: "/account/notifications", icon: <Bell size={20} />, label: "Notifications", active: isActive('/account/notifications') }
      );
    } else if (isLabStaff) {
      // Lab staff items
      items.push(
        { to: "/lab/notifications", icon: <Bell size={20} />, label: "Lab Notifications", active: isActive('/lab/notifications') }
      );
    } else if (isProductTeam) {
      // Product team items
      items.push(
        { to: "/product/notifications", icon: <Bell size={20} />, label: "Production Notifications", active: isActive('/product/notifications') }
      );
    } else {
      // Default fallback for other roles
      items.push(
        { to: "/notifications", icon: <Bell size={20} />, label: "Notifications", active: isActive('/notifications') }
      );
    }
    
    return items;
  };

  return (
    <>
      {open && <div className={styles.overlay} onClick={onClose}></div>}
      <div className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close sidebar">
          <X size={20} />
        </button>
        <nav>
          {getNavigationItems().map((item, index) => (
            <Link 
              key={index}
              to={item.to} 
              className={`${styles.navLink} ${item.active ? styles.active : ''}`}
              onClick={onClose}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.mobileLogoutWrapper}>
          <button className={styles.mobileLogoutBtn} onClick={logout}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </div>
    </>
  );
} 