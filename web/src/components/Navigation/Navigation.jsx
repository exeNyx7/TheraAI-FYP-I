/**
 * Navigation Component
 * Responsive navigation with role-based menu items
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  MessageSquare, 
  TrendingUp, 
  BookOpen, 
  Users, 
  Calendar, 
  FileText, 
  Library, 
  User, 
  BarChart3, 
  Settings, 
  Shield, 
  Activity,
  LogOut,
  Brain,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import './Navigation.css';

function Navigation() {
  const { user, logout, isPatient, isPsychiatrist, isAdmin } = useAuth();
  const { showSuccess } = useToast();
  const isMember = isPatient; // Alias for better UX
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
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

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', newState);
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const commonItems = [
      { path: '/dashboard', label: 'Dashboard', icon: Home }
    ];

    if (isMember()) {
      return [
        ...commonItems,
        { path: '/journal', label: 'Journal', icon: BookOpen },
        { path: '/mood-tracker', label: 'Moods', icon: BarChart3 },
        { path: '/sessions', label: 'My Sessions', icon: MessageSquare },
        { path: '/progress', label: 'My Progress', icon: TrendingUp },
        { path: '/resources', label: 'Wellness Resources', icon: Library },
        { path: '/community', label: 'Community', icon: Users },
        { path: '/profile', label: 'My Profile', icon: User }
      ];
    }

    if (isPsychiatrist()) {
      return [
        ...commonItems,
        { path: '/patients', label: 'Patients', icon: Users },
        { path: '/appointments', label: 'Appointments', icon: Calendar },
        { path: '/notes', label: 'Clinical Notes', icon: FileText },
        { path: '/resources', label: 'Resources', icon: Library },
        { path: '/profile', label: 'Profile', icon: User }
      ];
    }

    if (isAdmin()) {
      return [
        ...commonItems,
        { path: '/users', label: 'User Management', icon: Users },
        { path: '/analytics', label: 'Analytics', icon: Activity },
        { path: '/system', label: 'System Settings', icon: Settings },
        { path: '/security', label: 'Security', icon: Shield },
        { path: '/profile', label: 'Profile', icon: User }
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
      <nav className={`navigation ${isMobileMenuOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="navigation-header">
          <div className="logo">
            <Brain className="logo-icon" size={28} />
            <span className="logo-text">TheraAI</span>
          </div>
          <button className="collapse-btn" onClick={toggleCollapse} aria-label="Toggle sidebar">
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
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
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActiveRoute(item.path) ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <IconComponent className="nav-icon" size={20} />
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="navigation-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut className="nav-icon" size={20} />
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export default Navigation;