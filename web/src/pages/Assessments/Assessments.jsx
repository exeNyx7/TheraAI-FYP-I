import { useState, useEffect } from 'react';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AssessmentSelector } from '../../components/Assessments/AssessmentSelector';
import { Trophy, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../apiClient';

const TAB_LIBRARY = 'library';
const TAB_HISTORY = 'history';
const TAB_TAKING = 'taking';

export default function Assessments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showInfo } = useToast();
  const [activeTab, setActiveTab] = useState(TAB_LIBRARY);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === TAB_HISTORY) {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await apiClient.get('/assessments/history');
      setHistory(response.data || []);
    } catch (err) {
      console.error('Failed to fetch assessment history:', err);
      setHistory([]);
      showInfo('Failed to load assessment history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectAssessment = async (assessment) => {
    try {
      // Fetch the full assessment template with questions
      const response = await apiClient.get(`/assessments/${assessment.slug}`);
      setActiveAssessment(response.data);
      setStep(0);
      setActiveTab('taking');
      showInfo(`Starting: ${assessment.name}`);
    } catch (err) {
      console.error('Failed to load assessment:', err);
      showInfo('Failed to load assessment');
    }
  };

  const handleBackFromAssessment = () => {
    setActiveAssessment(null);
    setStep(0);
    setActiveTab('library');
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
            {!activeAssessment && (
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
            )}

            {activeAssessment && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{activeAssessment.name}</h2>
                  <Button variant="outline" onClick={handleBackFromAssessment}>
                    Back
                  </Button>
                </div>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground mb-6">{activeAssessment.description}</p>
                    <div className="space-y-6">
                      {activeAssessment.questions && activeAssessment.questions.length > 0 ? (
                        <>
                          <p className="text-sm font-medium">
                            Question {step + 1} of {activeAssessment.questions.length}
                          </p>
                          {/* Assessment form will be implemented here */}
                          <p className="text-center py-8 text-muted-foreground">
                            Assessment taking form coming soon...
                          </p>
                        </>
                      ) : (
                        <p className="text-center py-8 text-red-500">
                          Failed to load assessment questions
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!activeAssessment && activeTab === TAB_LIBRARY && (
              <AssessmentSelector onSelect={handleSelectAssessment} />
            )}

            {!activeAssessment && activeTab === TAB_HISTORY && (
              <div className="space-y-4">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Trophy className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>No assessments completed yet. Start one from the Library tab.</p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold">Completed Assessments</h2>
                    <div className="space-y-4">
                      {history.map((a) => {
                        const percentage = a.max_possible_score > 0
                          ? Math.round((a.total_score / a.max_possible_score) * 100)
                          : 0;

                        return (
                          <Card key={a.id} className="hover:shadow-md transition-all">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-semibold">{a.assessment_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {a.severity_label} · {new Date(a.completed_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-3xl font-bold text-primary">{a.total_score}</p>
                                  <p className="text-xs text-muted-foreground">/{a.max_possible_score}</p>
                                </div>
                              </div>
                              <div className="mt-4 space-y-1">
                                <div className="w-full bg-muted rounded-full h-2.5">
                                  <div
                                    className="bg-primary h-2.5 rounded-full transition-all duration-700"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>0</span><span>{a.max_possible_score}</span>
                                </div>
                              </div>
                              <div className="mt-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-transparent"
                                  onClick={() => navigate(`/assessment/results/${a.id}`, { state: { result: a } })}
                                >
                                  View Results
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
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

