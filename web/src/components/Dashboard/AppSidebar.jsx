import { useAuth } from '../../contexts/AuthContext';
import { TherapistSidebar } from './TherapistSidebar';
import { SidebarNav } from './SidebarNav';

/**
 * Role-aware sidebar — renders TherapistSidebar for therapist/psychiatrist/admin,
 * and SidebarNav for patients.
 * Import this in every page instead of importing SidebarNav directly.
 */
export function AppSidebar() {
  const { user } = useAuth();
  const isTherapistRole = ['therapist', 'psychiatrist'].includes(user?.role);
  return isTherapistRole ? <TherapistSidebar /> : <SidebarNav />;
}
