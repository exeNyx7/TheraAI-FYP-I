import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import {
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  TrendingUp,
  Trophy,
  Calendar,
  User,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: BookOpen, label: 'Journal', href: '/journal' },
  { icon: MessageCircle, label: 'Mindful Chat', href: '/chat' },
  { icon: TrendingUp, label: 'Moods', href: '/mood' },
  { icon: Trophy, label: 'Assessments', href: '/assessments' },
  { icon: Calendar, label: 'Appointments', href: '/appointments' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function SidebarNav() {
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  // Collapse functionality - temporarily disabled
  // const [isCollapsed, setIsCollapsed] = useState(() => {
  //   const saved = localStorage.getItem('sidebar-collapsed');
  //   return saved === 'true';
  // });
  const isCollapsed = false; // Always expanded for now

  // Update body class when collapsed state changes
  React.useEffect(() => {
    // Always set to expanded since collapse is disabled
    document.body.classList.add('sidebar-expanded');
    document.body.classList.remove('sidebar-collapsed');
    
    // Cleanup function
    return () => {
      document.body.classList.remove('sidebar-collapsed', 'sidebar-expanded');
    };
  }, []); // Empty dependency array since isCollapsed is always false

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Collapse toggle function - temporarily disabled
  // const toggleCollapse = () => {
  //   const newState = !isCollapsed;
  //   setIsCollapsed(newState);
  //   localStorage.setItem('sidebar-collapsed', newState);
  // };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-sidebar to-sidebar/95 border-r-2 border-sidebar-border p-6 flex flex-col transition-all duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Logo and Collapse Button */}
        <div className="flex items-center justify-between mb-10">
        <Link to="/dashboard" className={`flex items-center gap-3 group ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 flex-shrink-0">
            <span className="text-sm font-bold text-primary-foreground" style={{ fontFamily: 'Montserrat' }}>
              T
            </span>
          </div>
          {!isCollapsed && (
            <span className="text-2xl font-semibold transition-opacity duration-300" style={{ fontFamily: 'Montserrat' }}>
              Thera-AI
            </span>
          )}
        </Link>
        {/* Collapse buttons - temporarily disabled */}
        {/* {!isCollapsed && (
          <button
            onClick={toggleCollapse}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-accent/40 hover:bg-sidebar-accent/60 text-sidebar-foreground transition-all duration-200"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {isCollapsed && (
          <button
            onClick={toggleCollapse}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-accent/40 hover:bg-sidebar-accent/60 text-sidebar-foreground transition-all duration-200 absolute right-2 top-6"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )} */}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-2 mb-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? item.label : ''}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-primary/30 to-primary/10 text-primary border-l-4 border-primary shadow-md'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 flex-shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}
                />
                {!isCollapsed && (
                  <>
                    <span className="font-medium">{item.label}</span>
                    {isActive && <ChevronRight className="h-4 w-4 ml-auto animate-pulse" />}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout button */}
        <Button
          onClick={handleLogout}
          variant="ghost"
          title={isCollapsed ? 'Log Out' : ''}
          className={`w-full gap-3 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 ${
            isCollapsed ? 'justify-center px-2' : 'justify-start'
          }`}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Log Out</span>}
        </Button>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
        />
      )}
    </>
  );
}
