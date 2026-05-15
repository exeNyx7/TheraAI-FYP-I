import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../Notifications/NotificationBell';
import {
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  TrendingUp,
  Calendar,
  User,
  Settings,
  LogOut,
  ChevronRight,
  ChevronUp,
  Menu,
  X,
  Zap,
  Users,
  ClipboardList,
  ShieldCheck,
  History,
  BookMarked,
} from 'lucide-react';

const ROLE_LABELS = {
  patient:      '',          // never call users "Patient" in patient-facing UI
  psychiatrist: 'Therapist',
  therapist:    'Therapist',
  admin:        'Admin',
};

const THERAPIST_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',    href: '/dashboard' },
  { icon: Users,           label: 'My Patients',  href: '/patients' },
  { icon: Calendar,        label: 'Appointments', href: '/appointments' },
  { icon: ClipboardList,   label: 'Schedule',     href: '/schedule' },
];

const NAV_BY_ROLE = {
  patient: [
    { icon: LayoutDashboard, label: 'Dashboard',    href: '/dashboard' },
    { icon: BookOpen,        label: 'My Diary',      href: '/journal' },
    { icon: MessageCircle,   label: 'Mindful Chat',  href: '/chat' },
    { icon: TrendingUp,      label: 'Mood Tracking', href: '/mood' },
    { icon: ClipboardList,   label: 'Assessments',   href: '/assessments' },
    { icon: Zap,             label: 'Achievements',  href: '/achievements' },
    { icon: Calendar,        label: 'Appointments',  href: '/appointments' },
    { icon: History,         label: 'My Sessions',   href: '/sessions' },
    { icon: BookMarked,      label: 'Resources',     href: '/resources' },
  ],
  psychiatrist: THERAPIST_NAV,
  therapist:    THERAPIST_NAV,
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard',     href: '/dashboard' },
    { icon: Users,           label: 'Users',         href: '/users' },
    { icon: Calendar,        label: 'Appointments',  href: '/admin/appointments' },
    { icon: ShieldCheck,     label: 'Reports',       href: '/resources' },
  ],
};

function UserMenu({ user, isCollapsed, onLogout }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const initials = user?.full_name
    ? user.full_name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || 'U').toUpperCase();
  const fullName = user?.full_name || user?.email || 'User';
  const roleLabel = ROLE_LABELS[user?.role] || '';

  return (
    <div ref={ref} className="relative mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        title={isCollapsed ? fullName : ''}
        className={`w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-sidebar-accent/60 transition-all duration-200 group ${
          isCollapsed ? 'justify-center' : ''
        }`}
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 text-primary-foreground font-semibold text-xs shadow-sm">
          {initials}
        </div>
        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium leading-tight">{initials}</p>
              {roleLabel && <p className="text-xs text-muted-foreground leading-tight">{roleLabel}</p>}
            </div>
            <ChevronUp
              className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
                open ? '' : 'rotate-180'
              }`}
            />
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute z-50 w-56 bg-background border border-border rounded-xl shadow-xl overflow-hidden"
          style={{ bottom: 'calc(100% + 8px)', left: 0 }}
        >
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <p className="text-sm font-semibold truncate">{fullName}</p>
            {roleLabel && <p className="text-xs text-muted-foreground">{roleLabel}</p>}
          </div>
          <div className="p-1">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm text-foreground"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              Profile
            </Link>
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm text-foreground"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Settings
            </Link>
            <div className="border-t border-border my-1" />
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors text-sm"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SidebarNav() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const role = user?.role || 'patient';

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
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

  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.patient;

  return (
    <>
      {/* Mobile header bar — full-width, prevents hamburger from overlapping content */}
      <header className="fixed top-0 left-0 right-0 h-16 z-40 lg:hidden flex items-center px-4 gap-3 bg-background/95 backdrop-blur-sm border-b border-border">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm flex-shrink-0"
          aria-label="Toggle navigation"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <img src="/logo.svg" alt="TheraAI" className="h-9 w-auto object-contain" />
      </header>

      {/* Desktop collapse button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ left: isCollapsed ? '3.5rem' : '13.5rem' }}
        className="hidden lg:flex fixed top-1/2 z-50 -translate-y-1/2 items-center justify-center h-10 w-5 bg-primary/10 hover:bg-primary/20 rounded-r-lg transition-all duration-300 border-r border-primary/20"
        aria-label="Collapse sidebar"
      >
        <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-sidebar to-sidebar/95 border-r border-sidebar-border p-4 flex flex-col transition-all duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'w-16' : 'w-56'}`}
      >
        {/* Logo */}
        <Link
          to={['psychiatrist', 'therapist'].includes(role) ? '/therapist-dashboard' : '/dashboard'}
          className={`flex items-center gap-2.5 mb-7 group ${isCollapsed ? 'justify-center' : ''}`}
          onClick={() => setIsOpen(false)}
        >
          {isCollapsed ? (
            <img
              src="/logo.svg"
              alt="TheraAI"
              className="h-11 w-11 object-contain flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col">
              <img
                src="/logo.svg"
                alt="TheraAI"
                className="h-14 w-auto max-w-[160px] object-contain group-hover:scale-105 transition-transform duration-300"
              />
              {role !== 'patient' && (
                <p className="text-xs text-muted-foreground mt-0.5 pl-0.5">{ROLE_LABELS[role] || role}</p>
              )}
            </div>
          )}
        </Link>

        {/* Navigation items */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/dashboard' &&
                item.href !== '/therapist-dashboard' &&
                location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                to={item.href}
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? item.label : ''}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isCollapsed ? 'justify-center px-0' : ''
                } ${
                  isActive
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                }`}
              >
                <Icon
                  className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${
                    isActive ? 'scale-110' : 'group-hover:scale-105'
                  }`}
                />
                {!isCollapsed && (
                  <>
                    <span className="text-sm">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="pt-3 border-t border-sidebar-border/50 space-y-0.5 mt-3">
          <NotificationBell isCollapsed={isCollapsed} />
          <UserMenu user={user} isCollapsed={isCollapsed} onLogout={handleLogout} />
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}

      {/* Spacer */}
      <div
        className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-56'
        }`}
      />
    </>
  );
}
