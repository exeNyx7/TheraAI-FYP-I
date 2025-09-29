/**
 * Navigation Component
 * Responsive navigation with role-based menu items
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import './Navigation.css';

function Navigation() {
  const { user, logout, isPatient, isPsychiatrist, isAdmin } = useAuth();
  const { showSuccess } = useToast();
  const isMember = isPatient; // Alias for better UX
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      showSuccess('Successfully logged out. Come back soon!');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login'); // Navigate anyway
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const commonItems = [
      { path: '/dashboard', label: 'Dashboard', icon: '🏠' }
    ];

    if (isMember()) {
      return [
        ...commonItems,
        { path: '/sessions', label: 'My Sessions', icon: '💬' },
        { path: '/progress', label: 'My Progress', icon: '📈' },
        { path: '/resources', label: 'Wellness Resources', icon: '📚' },
        { path: '/community', label: 'Community', icon: '🤝' },
        { path: '/profile', label: 'My Profile', icon: '👤' }
      ];
    }

    if (isPsychiatrist()) {
      return [
        ...commonItems,
        { path: '/patients', label: 'Patients', icon: '👥' },
        { path: '/appointments', label: 'Appointments', icon: '📅' },
        { path: '/notes', label: 'Clinical Notes', icon: '📝' },
        { path: '/resources', label: 'Resources', icon: '📚' },
        { path: '/profile', label: 'Profile', icon: '👤' }
      ];
    }

    if (isAdmin()) {
      return [
        ...commonItems,
        { path: '/users', label: 'User Management', icon: '👥' },
        { path: '/analytics', label: 'Analytics', icon: '📊' },
        { path: '/system', label: 'System Settings', icon: '⚙️' },
        { path: '/security', label: 'Security', icon: '🔐' },
        { path: '/profile', label: 'Profile', icon: '👤' }
      ];
    }

    return commonItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={toggleMobileMenu}
        aria-label="Toggle navigation menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={closeMobileMenu}></div>
      )}

      {/* Navigation Sidebar */}
      <nav className={`navigation ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="navigation-header">
          <div className="logo">
            <span className="logo-icon">🧠</span>
            <span className="logo-text">TheraAI</span>
          </div>
        </div>

        <div className="navigation-content">
          {/* User Info */}
          <div className="user-info">
            <div className="user-avatar">
              {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.full_name || 'User'}</span>
              <span className="user-role">{user?.role || 'Unknown'}</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="navigation-menu">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActiveRoute(item.path) ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="navigation-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export default Navigation;