import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../Notifications/NotificationBell';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  LogOut,
  ChevronRight,
  ChevronUp,
  Menu,
  X,
  User,
  Activity,
  ClipboardList,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',       href: '/dashboard' },
  { icon: Users,           label: 'My Patients',     href: '/patients' },
  { icon: Calendar,        label: 'Schedule',        href: '/schedule' },
  { icon: ClipboardList,   label: 'Treatment Plans', href: '/treatment-plans' },
  { icon: Activity,        label: 'Progress',        href: '/therapist-progress' },
];

function UserMenu({ user, isCollapsed, onLogout }) {
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
    : (user?.email?.[0] || 'D').toUpperCase();
  const fullName = user?.full_name || user?.email || 'Doctor';

  return (
    <div ref={ref} className="relative mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        title={isCollapsed ? fullName : ''}
        className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent/60 transition-all duration-200 ${
          isCollapsed ? 'justify-center' : ''
        }`}
      >
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 text-primary-foreground font-semibold text-xs shadow-sm">
          {initials}
        </div>
        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium leading-tight">{initials}</p>
              <p className="text-xs text-muted-foreground leading-tight">Therapist</p>
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
            <p className="text-xs text-muted-foreground">Therapist</p>
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

export function TherapistSidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
      >
        <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-sidebar to-sidebar/95 border-r-2 border-sidebar-border p-4 flex flex-col transition-all duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Logo */}
        <Link
          to="/dashboard"
          className={`flex items-center gap-3 mb-8 group ${isCollapsed ? 'justify-center' : ''}`}
          onClick={() => setIsOpen(false)}
        >
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 flex-shrink-0">
            <span className="text-xs font-bold text-primary-foreground" style={{ fontFamily: 'Montserrat' }}>DR</span>
          </div>
          {!isCollapsed && (
            <div>
              <span className="text-lg font-semibold block" style={{ fontFamily: 'Montserrat' }}>Thera-AI</span>
              <span className="text-xs text-muted-foreground">Therapist Portal</span>
            </div>
          )}
        </Link>

        {/* Navigation items */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/therapist-dashboard' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={`${item.href}-${item.label}`}
                to={item.href}
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? item.label : ''}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isCollapsed ? 'justify-center px-0' : ''
                } ${
                  isActive
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                {!isCollapsed && (
                  <>
                    <span className="text-sm">{item.label}</span>
                    {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
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
        <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/50 z-30 md:hidden" />
      )}

      {/* Spacer */}
      <div className={`hidden md:block flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`} />
    </>
  );
}
