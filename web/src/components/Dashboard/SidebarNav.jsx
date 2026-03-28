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
  Menu,
  X,
  Zap,
  Users,
  ClipboardList,
  ShieldCheck,
} from 'lucide-react';

// Nav items per role — only what each role actually needs
const NAV_BY_ROLE = {
  patient: [
    { icon: LayoutDashboard, label: 'Dashboard',     href: '/dashboard' },
    { icon: BookOpen,        label: 'Journal',        href: '/journal' },
    { icon: MessageCircle,   label: 'Mindful Chat',   href: '/chat' },
    { icon: TrendingUp,      label: 'Mood Tracking',  href: '/mood' },
    { icon: ClipboardList,   label: 'Assessments',    href: '/assessments' },
    { icon: Zap,             label: 'Achievements',   href: '/achievements' },
    { icon: Calendar,        label: 'Appointments',   href: '/appointments' },
    { icon: User,            label: 'Profile',        href: '/profile' },
    { icon: Settings,        label: 'Settings',       href: '/settings' },
  ],
  psychiatrist: [
    { icon: LayoutDashboard, label: 'Dashboard',      href: '/therapist-dashboard' },
    { icon: Users,           label: 'My Patients',    href: '/therapist-dashboard' },
    { icon: Calendar,        label: 'Appointments',   href: '/appointments' },
    { icon: User,            label: 'Profile',        href: '/profile' },
    { icon: Settings,        label: 'Settings',       href: '/settings' },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard',      href: '/dashboard' },
    { icon: Users,           label: 'Users',          href: '/users' },
    { icon: ShieldCheck,     label: 'Reports',        href: '/resources' },
    { icon: User,            label: 'Profile',        href: '/profile' },
    { icon: Settings,        label: 'Settings',       href: '/settings' },
  ],
};

export function SidebarNav() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  React.useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
      document.body.classList.remove('sidebar-expanded');
    } else {
      document.body.classList.add('sidebar-expanded');
      document.body.classList.remove('sidebar-collapsed');
    }
    localStorage.setItem('sidebar-collapsed', isCollapsed);
    return () => {
      document.body.classList.remove('sidebar-collapsed', 'sidebar-expanded');
    };
  }, [isCollapsed]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const role = user?.role || 'patient';
  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.patient;

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg"
        aria-label="Toggle navigation"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Desktop collapse button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ left: isCollapsed ? '4.5rem' : '15.5rem' }}
        className="hidden lg:flex fixed top-1/2 z-50 -translate-y-1/2 items-center justify-center h-10 w-5 bg-primary/10 hover:bg-primary/20 rounded-r-lg transition-all duration-300 border-r border-primary/20"
        aria-label="Collapse sidebar"
      >
        <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-sidebar to-sidebar/95 border-r-2 border-sidebar-border p-6 flex flex-col transition-all duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Logo */}
        <Link
          to={role === 'psychiatrist' ? '/therapist-dashboard' : '/dashboard'}
          className={`flex items-center gap-3 mb-10 group ${isCollapsed ? 'justify-center' : ''}`}
          onClick={() => setIsOpen(false)}
        >
          <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 flex-shrink-0">
            <span className="text-sm font-bold text-primary-foreground" style={{ fontFamily: 'Montserrat' }}>
              T
            </span>
          </div>
          {!isCollapsed && (
            <div>
              <span className="text-2xl font-semibold transition-opacity duration-300" style={{ fontFamily: 'Montserrat' }}>
                Thera-AI
              </span>
              {role !== 'patient' && (
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              )}
            </div>
          )}
        </Link>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1 mb-8 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/therapist-dashboard' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                to={item.href}
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? item.label : ''}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isCollapsed ? 'justify-center px-0' : ''
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-primary/30 to-primary/10 text-primary border-l-4 border-primary shadow-md'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-200 flex-shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
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

      {/* Spacer to offset main content on desktop */}
      <div className={`hidden md:block flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`} />
    </>
  );
}
