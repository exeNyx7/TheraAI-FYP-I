import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Activity,
  ClipboardList,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/therapist-dashboard' },
  { icon: Users, label: 'My Patients', href: '/therapist-dashboard' },
  { icon: Calendar, label: 'Schedule', href: '/appointments' },
  { icon: MessageSquare, label: 'Messaging', href: '/chat' },
  { icon: ClipboardList, label: 'Treatment Plans', href: '/treatment-plans' },
  { icon: Activity, label: 'Progress', href: '/assessments' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function TherapistSidebar() {
  const location = useLocation();
  const { logout } = useAuth();
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
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-sidebar to-sidebar/95 border-r-2 border-sidebar-border p-6 flex flex-col transition-all duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Logo */}
        <Link
          to="/therapist-dashboard"
          className={`flex items-center gap-3 mb-10 group ${isCollapsed ? 'justify-center' : ''}`}
          onClick={() => setIsOpen(false)}
        >
          <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 flex-shrink-0">
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
        <nav className="flex-1 space-y-1 mb-8 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href ||
              (item.href !== '/therapist-dashboard' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
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
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-105'} transition-transform`} />
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

        {/* Logout */}
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
        <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/50 z-30 md:hidden" />
      )}

      {/* Spacer */}
      <div className={`hidden md:block flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`} />
    </>
  );
}
