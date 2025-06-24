import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Set comprehensive CSS variables for theme
    if (theme === 'dark') {
      // Dark theme variables
      document.documentElement.style.setProperty('--primary-bg', '#1a1a1a');
      document.documentElement.style.setProperty('--secondary-bg', '#2d2d2d');
      document.documentElement.style.setProperty('--tertiary-bg', '#3d3d3d');
      document.documentElement.style.setProperty('--primary-text', '#ffffff');
      document.documentElement.style.setProperty('--secondary-text', '#b0b0b0');
      document.documentElement.style.setProperty('--accent-color', '#4a9eff');
      document.documentElement.style.setProperty('--success-color', '#4caf50');
      document.documentElement.style.setProperty('--warning-color', '#ff9800');
      document.documentElement.style.setProperty('--error-color', '#f44336');
      document.documentElement.style.setProperty('--border-color', '#404040');
      document.documentElement.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)');
      document.documentElement.style.setProperty('--card-bg', '#2d2d2d');
      document.documentElement.style.setProperty('--input-bg', '#3d3d3d');
      document.documentElement.style.setProperty('--input-border', '#404040');
      document.documentElement.style.setProperty('--input-text', '#ffffff');
      
      // Navbar and sidebar specific - keep dark for both themes
      document.documentElement.style.setProperty('--navbar-bg', '#1e1e1e');
      document.documentElement.style.setProperty('--navbar-text', '#ffffff');
      document.documentElement.style.setProperty('--sidebar-bg', '#1e1e1e');
      document.documentElement.style.setProperty('--sidebar-text', '#ffffff');
      
      // Body styles
      document.body.style.background = '#1a1a1a';
      document.body.style.color = '#ffffff';
    } else {
      // Light theme variables
      document.documentElement.style.setProperty('--primary-bg', '#ffffff');
      document.documentElement.style.setProperty('--secondary-bg', '#f8f9fa');
      document.documentElement.style.setProperty('--tertiary-bg', '#e9ecef');
      document.documentElement.style.setProperty('--primary-text', '#212529');
      document.documentElement.style.setProperty('--secondary-text', '#6c757d');
      document.documentElement.style.setProperty('--accent-color', '#007bff');
      document.documentElement.style.setProperty('--success-color', '#28a745');
      document.documentElement.style.setProperty('--warning-color', '#ffc107');
      document.documentElement.style.setProperty('--error-color', '#dc3545');
      document.documentElement.style.setProperty('--border-color', '#dee2e6');
      document.documentElement.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');
      document.documentElement.style.setProperty('--card-bg', '#ffffff');
      document.documentElement.style.setProperty('--input-bg', '#ffffff');
      document.documentElement.style.setProperty('--input-border', '#ced4da');
      document.documentElement.style.setProperty('--input-text', '#495057');
      
      // Navbar and sidebar specific - keep dark for both themes
      document.documentElement.style.setProperty('--navbar-bg', '#2c3e50');
      document.documentElement.style.setProperty('--navbar-text', '#ecf0f1');
      document.documentElement.style.setProperty('--sidebar-bg', '#2c3e50');
      document.documentElement.style.setProperty('--sidebar-text', '#ecf0f1');
      
      // Body styles
      document.body.style.background = '#f8f9fa';
      document.body.style.color = '#212529';
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 