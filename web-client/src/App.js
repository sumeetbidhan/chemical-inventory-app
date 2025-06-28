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
import AccountTeamDashboard from './components/AccountTeamDashboard';
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

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: 'var(--secondary-bg, #f8f9fa)'
    }}>
      {!isMobile && <NavBar onToggleTheme={toggleTheme} theme={theme} />}
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

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
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
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chemicals"
        element={
          <ProtectedRoute>
            <ChemicalsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <AccountTeamDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <MobileThemeToggle />
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
