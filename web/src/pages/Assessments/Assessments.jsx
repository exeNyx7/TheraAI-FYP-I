import { useState, useEffect } from 'react';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AssessmentSelector } from '../../components/Assessments/AssessmentSelector';
import { Trophy, Loader2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../apiClient';

function TherapistAssessmentsView() {
  return (
    <div className="flex min-h-screen bg-background">
      <TherapistSidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
          <div>
            <h1
              className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent"
              style={{ fontFamily: 'Montserrat' }}
            >
              Patient Assessment Results
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Review completed assessments and progress across your caseload
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Montserrat' }}>
                <Activity className="h-5 w-5" /> Clinical Progress Overview
              </CardTitle>
              <CardDescription>
                Aggregated assessment scores (PHQ-9, GAD-7, stress) for each patient will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 border border-dashed border-border rounded-lg text-center text-muted-foreground">
                Coming soon — backend wiring in next phase
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

const TAB_LIBRARY = 'library';
const TAB_HISTORY = 'history';

const severityColors = {
  low: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  critical: 'text-red-600 bg-red-50 border-red-200',
};

export default function Assessments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showInfo, showSuccess } = useToast();

  const [activeTab, setActiveTab] = useState(TAB_LIBRARY);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Assessment taking state
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Result detail view
  const [detailResult, setDetailResult] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === TAB_HISTORY) fetchHistory();
  }, [activeTab]);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await apiClient.get('/assessments/history');
      setHistory(response.data || []);
    } catch (err) {
      console.error('Failed to fetch assessment history:', err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectAssessment = async (assessment) => {
    try {
      const response = await apiClient.get(`/assessments/${assessment.slug}`);
      setActiveAssessment(response.data);
      setCurrentQuestion(0);
      setAnswers({});
      setResult(null);
    } catch (err) {
      console.error('Failed to load assessment:', err);
      showInfo('Failed to load assessment. Please try again.');
    }
  };

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    setCurrentQuestion(prev => prev + 1);
  };

  const handlePrev = () => {
    setCurrentQuestion(prev => prev - 1);
  };

  const handleSubmit = async () => {
    const questions = activeAssessment.questions;
    const unanswered = questions.filter(q => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      showInfo(`Please answer all questions before submitting.`);
      // Jump to first unanswered question
      setCurrentQuestion(questions.indexOf(unanswered[0]));
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        answers: questions.map(q => ({ question_id: q.id, value: answers[q.id] })),
      };
      const response = await apiClient.post(`/assessments/${activeAssessment.slug}/submit`, payload);
      setResult(response.data);
      showSuccess('Assessment completed!');
    } catch (err) {
      console.error('Failed to submit assessment:', err);
      showInfo('Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToLibrary = () => {
    setActiveAssessment(null);
    setResult(null);
    setAnswers({});
    setCurrentQuestion(0);
    setDetailResult(null);
  };

  const handleViewResultDetail = async (resultId) => {
    try {
      const response = await apiClient.get(`/assessments/history/${resultId}`);
      setDetailResult(response.data);
    } catch (err) {
      console.error('Failed to fetch result detail:', err);
      showInfo('Failed to load result details.');
    }
  };

  if (!user) return null;

  // ── Result detail overlay ──────────────────────────────────────────────
  if (detailResult) {
    const pct = detailResult.max_possible_score > 0
      ? Math.round((detailResult.total_score / detailResult.max_possible_score) * 100)
      : 0;
    return (
      <div className="flex">
        <AppSidebar />
        <main className="flex-1 pt-16 md:pt-0">
          <div className="bg-background min-h-screen">
            <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{detailResult.assessment_name} — Results</h2>
                <Button variant="outline" onClick={() => setDetailResult(null)}>Back</Button>
              </div>
              <Card className={`border-2 ${severityColors[detailResult.severity_level]}`}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold">{detailResult.severity_label}</p>
                      <p className="text-sm opacity-80">
                        Completed on {new Date(detailResult.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold">{detailResult.total_score}</p>
                      <p className="text-sm opacity-80">/ {detailResult.max_possible_score}</p>
                    </div>
                  </div>
                  <div className="w-full bg-white/50 rounded-full h-3">
                    <div
                      className="bg-current h-3 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm font-semibold text-muted-foreground mb-2">AI Recommendation</p>
                  <p className="text-foreground leading-relaxed">{detailResult.ai_recommendation}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Assessment result view (after submit) ─────────────────────────────
  if (result) {
    const pct = result.max_possible_score > 0
      ? Math.round((result.total_score / result.max_possible_score) * 100)
      : 0;
    return (
      <div className="flex">
        <AppSidebar />
        <main className="flex-1 pt-16 md:pt-0">
          <div className="bg-background min-h-screen">
            <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <h2 className="text-2xl font-bold">Assessment Complete</h2>
              </div>

              <Card className={`border-2 ${severityColors[result.severity_level]}`}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold">{result.severity_label}</p>
                      <p className="text-sm opacity-80">{result.assessment_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold">{result.total_score}</p>
                      <p className="text-sm opacity-80">/ {result.max_possible_score}</p>
                    </div>
                  </div>
                  <div className="w-full bg-white/50 rounded-full h-3">
                    <div
                      className="bg-current h-3 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <p className="text-sm font-semibold text-muted-foreground mb-2">AI Recommendation</p>
                  <p className="text-foreground leading-relaxed">{result.ai_recommendation}</p>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button onClick={handleBackToLibrary}>Back to Library</Button>
                <Button variant="outline" onClick={() => { handleBackToLibrary(); setActiveTab(TAB_HISTORY); }}>
                  View History
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Assessment taking view ────────────────────────────────────────────
  if (activeAssessment) {
    const questions = activeAssessment.questions || [];
    const q = questions[currentQuestion];
    const isLast = currentQuestion === questions.length - 1;
    const answeredCount = Object.keys(answers).length;
    const progressPct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

    return (
      <div className="flex">
        <AppSidebar />
        <main className="flex-1 pt-16 md:pt-0">
          <div className="bg-background min-h-screen">
            <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{activeAssessment.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Question {currentQuestion + 1} of {questions.length} · {answeredCount} answered
                  </p>
                </div>
                <Button variant="outline" onClick={handleBackToLibrary}>Exit</Button>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Question card */}
              {q && (
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <p className="text-lg font-medium leading-relaxed">{q.text}</p>
                    <div className="space-y-3">
                      {q.options.map((option) => {
                        const isSelected = answers[q.id] === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleAnswer(q.id, option.value)}
                            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border hover:border-primary/40 hover:bg-muted/50'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentQuestion === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>

                {isLast ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="gap-2"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                    ) : (
                      'Submit Assessment'
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={answers[q?.id] === undefined}
                    className="gap-2"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Question dots */}
              <div className="flex flex-wrap gap-2 justify-center">
                {questions.map((question, idx) => (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`h-3 w-3 rounded-full transition-all ${
                      idx === currentQuestion
                        ? 'bg-primary scale-125'
                        : answers[question.id] !== undefined
                        ? 'bg-primary/40'
                        : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Library / History tabs ────────────────────────────────────────────
  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
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
                        const pct = a.max_possible_score > 0
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
                                    style={{ width: `${pct}%` }}
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
                                  onClick={() => handleViewResultDetail(a.id)}
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
