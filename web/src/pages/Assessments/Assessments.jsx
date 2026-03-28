import { useState, useEffect } from 'react';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AssessmentSelector } from '../../components/Assessments/AssessmentSelector';
import { Trophy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';

const TAB_LIBRARY = 'library';
const TAB_HISTORY = 'history';

const mockHistory = [
  { id: '1', name: 'Stress Level Assessment', category: 'Clinical', score: 72, date: '2026-03-20' },
  { id: '2', name: 'Anxiety Screening (GAD-7)', category: 'Clinical', score: 58, date: '2026-03-10' },
  { id: '3', name: 'Depression Screening (PHQ-9)', category: 'Clinical', score: 45, date: '2026-03-01' },
];

export default function Assessments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showInfo } = useToast();
  const [activeTab, setActiveTab] = useState(TAB_LIBRARY);
  const [history, setHistory] = useState(mockHistory);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const handleSelectAssessment = (assessment) => {
    setActiveAssessment(assessment);
    showInfo(`Starting: ${assessment.name}`);
    // In the future, navigate to a dedicated assessment flow page
  };

  if (!user) return null;

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
            {/* Header */}
            <div>
              <h1
                className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent"
                style={{ fontFamily: 'Montserrat' }}
              >
                Assessments & Progress
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Complete evidence-based assessments and track your mental health journey
              </p>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-border">
              {[{ key: TAB_LIBRARY, label: 'Assessment Library' }, { key: TAB_HISTORY, label: 'Your History' }].map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
                    activeTab === t.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === TAB_LIBRARY && (
              <AssessmentSelector onSelect={handleSelectAssessment} />
            )}

            {activeTab === TAB_HISTORY && (
              <div className="space-y-4">
                {history.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Trophy className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>No assessments completed yet. Start one from the Library tab.</p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold">Completed Assessments</h2>
                    <div className="space-y-4">
                      {history.map((a) => (
                        <Card key={a.id} className="hover:shadow-md transition-all">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold">{a.name}</p>
                                <p className="text-sm text-muted-foreground">{a.category} · {new Date(a.date).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-3xl font-bold text-primary">{a.score}</p>
                                <p className="text-xs text-muted-foreground">Score</p>
                              </div>
                            </div>
                            <div className="mt-4 space-y-1">
                              <div className="w-full bg-muted rounded-full h-2.5">
                                <div
                                  className="bg-primary h-2.5 rounded-full transition-all duration-700"
                                  style={{ width: `${a.score}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>0</span><span>100</span>
                              </div>
                            </div>
                            <div className="mt-4">
                              <Button size="sm" variant="outline" className="bg-transparent">View Results</Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
