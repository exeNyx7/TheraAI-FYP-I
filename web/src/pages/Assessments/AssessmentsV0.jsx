import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Card } from '../../components/ui/card';
import { ClipboardList, Clock } from 'lucide-react';

export default function AssessmentsV0() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 sidebar-content">
        <div className="bg-background min-h-screen">
          <div className="max-w-4xl mx-auto p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                Mental Health Assessments
              </h1>
              <p className="text-muted-foreground mt-2">
                Comprehensive assessments to track your mental wellness
              </p>
            </div>

            {/* Coming Soon Card */}
            <Card className="p-12">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                    <ClipboardList className="h-12 w-12 text-primary" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                </div>

                <div className="space-y-3 max-w-md">
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                    Coming Soon!
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We're working hard to bring you comprehensive mental health assessments. 
                    This feature will be available in upcoming iterations.
                  </p>
                </div>

                <div className="bg-muted rounded-lg p-6 max-w-lg w-full">
                  <h3 className="font-semibold mb-3">Planned Features:</h3>
                  <ul className="text-sm text-muted-foreground space-y-2 text-left">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Depression and anxiety screening tools</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Stress level assessments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Wellness progress tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Personalized recommendations based on results</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Historical assessment comparison</span>
                    </li>
                  </ul>
                </div>

                <p className="text-sm text-muted-foreground italic">
                  Stay tuned for updates!
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
