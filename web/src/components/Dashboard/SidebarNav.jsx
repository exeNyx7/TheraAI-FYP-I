import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../Notifications/NotificationBell';
import apiClient from '../../apiClient';
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
  CreditCard,
  Crown,
} from 'lucide-react';

const ROLE_LABELS = {
  patient:      '',          // never call users "Patient" in patient-facing UI
  psychiatrist: 'Therapist',
  therapist:    'Therapist',
  admin:        'Admin',
};

const THERAPIST_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',    href: '/dashboard' },
  { icon: Users,           label: 'My Patients',  href: '/dashboard' },
  { icon: Calendar,        label: 'Appointments', href: '/appointments' },
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
  ],
  psychiatrist: THERAPIST_NAV,
  therapist:    THERAPIST_NAV,
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard',     href: '/dashboard' },
    { icon: Users,           label: 'Users',         href: '/users' },
    { icon: CreditCard,      label: 'Subscriptions', href: '/admin/subscriptions' },
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
        title={isCollapsed ? displayName : ''}
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
            {user?.role === 'patient' && (
              <Link
                to="/subscription"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm text-primary font-medium"
              >
                <CreditCard className="h-4 w-4" />
                Upgrade Plan
              </Link>
            )}
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
  const [planTier, setPlanTier] = useState(null);
  const role = user?.role || 'patient';

  const refreshPlan = () => {
    if (role === 'patient') {
      apiClient.get('/payments/my-plan').then(r => setPlanTier(r.data.tier)).catch(() => {});
    }
  };

  // Fetch on mount / role change
  useEffect(() => { refreshPlan(); }, [role]);

  // Re-fetch when subscription page dispatches 'plan-updated' after verify
  useEffect(() => {
    window.addEventListener('plan-updated', refreshPlan);
    return () => window.removeEventListener('plan-updated', refreshPlan);
  }, [role]);

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
        style={{ left: isCollapsed ? '3.5rem' : '13.5rem' }}
        className="hidden lg:flex fixed top-1/2 z-50 -translate-y-1/2 items-center justify-center h-10 w-5 bg-primary/10 hover:bg-primary/20 rounded-r-lg transition-all duration-300 border-r border-primary/20"
        aria-label="Collapse sidebar"
      >
        <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-sidebar to-sidebar/95 border-r border-sidebar-border p-4 flex flex-col transition-all duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
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
          {role === 'patient' && (
            <Link
              to="/subscription"
              title={planTier && planTier !== 'free' ? `${planTier} plan — manage` : 'Upgrade your plan'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                planTier && planTier !== 'free'
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <Crown className="h-3.5 w-3.5 flex-shrink-0" />
              {!isCollapsed && (planTier && planTier !== 'free' ? planTier.toUpperCase() : 'Free Plan')}
            </Link>
          )}
          <NotificationBell isCollapsed={isCollapsed} />
          <UserMenu user={user} isCollapsed={isCollapsed} onLogout={handleLogout} />
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
        />
      )}

      {/* Spacer */}
      <div
        className={`hidden md:block flex-shrink-0 transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-56'
        }`}
      />
    </>
  );
}
