import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PatientDashboardV0 from './PatientDashboardV0';
import PsychiatristDashboardV0 from './PsychiatristDashboardV0';
import AdminDashboardV0 from './AdminDashboardV0';
import { Loader2 } from 'lucide-react';

export default function DashboardV0() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  switch (user.role) {
    case 'patient':
      return <PatientDashboardV0 />;
    case 'psychiatrist':
      return <PsychiatristDashboardV0 />;
    case 'admin':
      return <AdminDashboardV0 />;
    default:
      return <PatientDashboardV0 />;
  }
}
