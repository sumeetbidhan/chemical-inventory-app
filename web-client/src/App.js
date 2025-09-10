import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import LoginPage from './pages/AdminLoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminManagementPage from './pages/AdminManagementPage';
import ChemicalsDashboard from './components/ChemicalsDashboard';
import ChemicalDetailPage from './pages/ChemicalDetailPage';
import ChemicalPurchaseHistoryPage from './pages/ChemicalPurchaseHistoryPage';
import AccountTeamDashboard from './components/AccountTeamDashboard';
import NotificationDashboard from './components/NotificationDashboard';
import NavBar from './components/NavBar';
import SideBar from './components/SideBar';
import './App.module.scss';

function AppLayout({ children }) {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleHamburger = () => setSidebarOpen((prev) => !prev);
  const handleSidebarClose = () => setSidebarOpen(false);

  const handleOpenNotificationDashboard = () => {
    // Navigate to notification dashboard
    window.location.href = '/notifications';
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: 'var(--secondary-bg, #f8f9fa)'
    }}>
      {!isMobile && <NavBar onToggleTheme={toggleTheme} theme={theme} onOpenNotificationDashboard={handleOpenNotificationDashboard} />}
      {isMobile && (
        <button
          className={`globalHamburger${sidebarOpen ? ' hide' : ''}`}
          onClick={handleHamburger}
          aria-label="Open sidebar"
          style={{}}
        >
          <span></span><span></span><span></span>
        </button>
      )}
      <div style={{ display: 'flex', flex: 1 }}>
        <SideBar open={sidebarOpen} onClose={handleSidebarClose} />
        <main style={{ 
          flex: 1, 
          padding: '20px', 
          backgroundColor: 'var(--secondary-bg, #f8f9fa)',
          color: 'var(--primary-text, #212529)'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function MobileThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const check = () => setShow(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  if (!show) return null;
  return (
    <button className="mobileThemeToggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}

// Protected Route Component (enhanced version)
function ProtectedRouteWrapper({ children, allowedRoles = [], fallbackPath = '/dashboard' }) {
  const { user, userInfo, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  // If no specific roles are required, allow access
  if (allowedRoles.length === 0) {
    return <AppLayout>{children}</AppLayout>;
  }
  
  // Check if user has required role
  const userRole = userInfo?.role?.name || userInfo?.role;
  const userRoleId = userInfo?.role_id;
  
  // Check both role name and role_id
  const hasAccess = allowedRoles.some(role => {
    if (typeof role === 'string') {
      return userRole === role || userRole?.toLowerCase() === role.toLowerCase();
    } else if (typeof role === 'number') {
      return userRoleId === role;
    }
    return false;
  });
  
  if (!hasAccess) {
    console.log('Access denied:', {
      userRole,
      userRoleId,
      allowedRoles,
      fallbackPath
    });
    return <Navigate to={fallbackPath} replace />;
  }
  
  return <AppLayout>{children}</AppLayout>;
}

// Public Route Component (for login/register)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      } />
      <Route
        path="/dashboard"
        element={
          <ProtectedRouteWrapper>
            <DashboardPage />
          </ProtectedRouteWrapper>
        }
      />
      {/* ADMIN ONLY ROUTES */}
      <Route
        path="/admin"
        element={
          <ProtectedRouteWrapper allowedRoles={['ADMIN', 'admin', 1]}>
            <AdminManagementPage />
          </ProtectedRouteWrapper>
        }
      />
      <Route
        path="/chemicals"
        element={
          <ProtectedRouteWrapper allowedRoles={['ADMIN', 'admin', 1]}>
            <ChemicalsDashboard />
          </ProtectedRouteWrapper>
        }
      />
      <Route
        path="/chemicals/:id"
        element={
          <ProtectedRouteWrapper allowedRoles={['ADMIN', 'admin', 1]}>
            <ChemicalDetailPage />
          </ProtectedRouteWrapper>
        }
      />
      <Route
        path="/chemical-purchase-history/:id"
        element={
          <ProtectedRouteWrapper allowedRoles={['ADMIN', 'admin', 1]}>
            <ChemicalPurchaseHistoryPage />
          </ProtectedRouteWrapper>
        }
      />
      <Route
        path="/stock"
        element={
          <ProtectedRouteWrapper allowedRoles={['ADMIN', 'admin', 1]}>
            <div style={{ padding: '20px' }}>
              <h2>Stock Management</h2>
              <p>Stock management features are coming soon. This will include:</p>
              <ul>
                <li>Stock level monitoring</li>
                <li>Purchase order management</li>
                <li>Inventory movement tracking</li>
                <li>Supplier management</li>
              </ul>
            </div>
          </ProtectedRouteWrapper>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRouteWrapper allowedRoles={['ADMIN', 'admin', 1]}>
            <div style={{ padding: '20px' }}>
              <h2>Alerts & Monitoring</h2>
              <p>Alert system features are coming soon. This will include:</p>
              <ul>
                <li>Low stock alerts</li>
                <li>Expired chemical notifications</li>
                <li>Safety violation alerts</li>
                <li>Custom alert rules</li>
              </ul>
            </div>
          </ProtectedRouteWrapper>
        }
      />
      <Route
        path="/activity-log"
        element={
          <ProtectedRouteWrapper allowedRoles={['ADMIN', 'admin', 1]}>
            <div style={{ padding: '20px' }}>
              <h2>Activity Log</h2>
              <p>Activity logging features are coming soon. This will include:</p>
              <ul>
                <li>User activity tracking</li>
                <li>System event logging</li>
                <li>Audit trail management</li>
                <li>Export and reporting</li>
              </ul>
            </div>
          </ProtectedRouteWrapper>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRouteWrapper allowedRoles={['ADMIN', 'admin', 1]}>
            <div style={{ padding: '20px' }}>
              <h2>System Settings</h2>
              <p>System configuration features are coming soon. This will include:</p>
              <ul>
                <li>Application preferences</li>
                <li>Security settings</li>
                <li>User role configurations</li>
                <li>System parameters</li>
              </ul>
            </div>
          </ProtectedRouteWrapper>
        }
      />

      {/* ACCOUNT TEAM ROUTES */}
      <Route
        path="/account"
        element={
          <ProtectedRouteWrapper allowedRoles={['ACCOUNTS', 'accounts', 'ACCOUNT_TEAM', 'account_team', 4]}>
            <AccountTeamDashboard />
          </ProtectedRouteWrapper>
        }
      />
      <Route
        path="/account/notifications"
        element={
          <ProtectedRouteWrapper allowedRoles={['ACCOUNTS', 'accounts', 'ACCOUNT_TEAM', 'account_team', 4]}>
            <NotificationDashboard />
          </ProtectedRouteWrapper>
        }
      />

      {/* LAB TEAM ROUTES */}
      <Route
        path="/lab/notifications"
        element={
          <ProtectedRouteWrapper allowedRoles={['LAB', 'lab', 'LAB_STAFF', 'lab_staff', 2]}>
            <NotificationDashboard />
          </ProtectedRouteWrapper>
        }
      />

      {/* PRODUCT TEAM ROUTES */}
      <Route
        path="/product/notifications"
        element={
          <ProtectedRouteWrapper allowedRoles={['PRODUCT', 'product', 'PRODUCT_TEAM', 'product_team', 3]}>
            <NotificationDashboard />
          </ProtectedRouteWrapper>
        }
      />

      {/* SHARED ROUTES (All authenticated users) */}
      <Route
        path="/notifications"
        element={
          <ProtectedRouteWrapper>
            <NotificationDashboard />
          </ProtectedRouteWrapper>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <MobileThemeToggle />
          <AppRoutes />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
