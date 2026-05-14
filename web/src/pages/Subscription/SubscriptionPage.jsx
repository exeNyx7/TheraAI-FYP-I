import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { CheckCircle, Zap, Star, Shield, Crown, Loader2 } from 'lucide-react';
import apiClient from '../../apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const PLANS = [
  {
    tier: 'free',
    name: 'Free',
    price: 0,
    sessions: 1,
    duration: 15,
    description: 'One-time intro session',
    features: ['1 intro session (15 min)', 'AI chat assistant', 'Mood tracking', 'Journal'],
    icon: Shield,
    color: 'text-slate-500',
    border: 'border-slate-200',
    badge: null,
  },
  {
    tier: 'starter',
    name: 'Starter',
    price: 2499,
    sessions: 2,
    duration: 25,
    description: '2 sessions/month',
    features: ['2 sessions/month (25 min)', 'AI chat assistant', 'Mood tracking', 'Journal', 'Assessments'],
    icon: Zap,
    color: 'text-blue-500',
    border: 'border-blue-200',
    badge: null,
  },
  {
    tier: 'professional',
    name: 'Professional',
    price: 4499,
    sessions: 4,
    duration: 25,
    description: '4 sessions/month',
    features: ['4 sessions/month (25 min)', 'Priority matching', 'AI chat assistant', 'Full feature access'],
    icon: Star,
    color: 'text-primary',
    border: 'border-primary/40',
    badge: 'Most Popular',
  },
  {
    tier: 'intensive',
    name: 'Intensive',
    price: 7999,
    sessions: 8,
    duration: 30,
    description: '8 sessions/month',
    features: ['8 sessions/month (30 min)', 'Dedicated therapist', 'Priority support', 'Full feature access'],
    icon: Crown,
    color: 'text-violet-600',
    border: 'border-violet-300',
    badge: null,
  },
];

function formatPKR(amount) {
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchPlan();
  }, [user, navigate]);

  useEffect(() => {
    if (searchParams.get('subscribed') === 'true') {
      const sessionId = searchParams.get('session_id');
      if (sessionId) {
        apiClient.get('/payments/verify-session', { params: { session_id: sessionId } })
          .catch(() => {})
          .finally(() => {
            showSuccess('Subscription activated! Sessions have been added to your account.');
            fetchPlan().then(() => window.dispatchEvent(new Event('plan-updated')));
          });
      } else {
        showSuccess('Subscription activated! Sessions have been added to your account.');
        fetchPlan().then(() => window.dispatchEvent(new Event('plan-updated')));
      }
    }
    if (searchParams.get('cancelled') === 'true') {
      showError('Subscription checkout was cancelled.');
    }
  }, [searchParams]);

  // Refetch when tab becomes visible (e.g. returning from Stripe)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchPlan(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/payments/my-plan');
      setPlan(res.data);
    } catch {
      setPlan({ tier: 'free', status: 'inactive', sessions_remaining: 0, free_intro_used: false });
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const res = await apiClient.get('/payments/billing-portal');
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) {
      showError(e.response?.data?.detail || 'Could not open billing portal. Check Stripe configuration.');
    } finally {
      setManagingBilling(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await apiClient.post('/payments/cancel');
      setShowCancelDialog(false);
      showSuccess('Your subscription will cancel at the end of the billing period.');
      fetchPlan().then(() => window.dispatchEvent(new Event('plan-updated')));
    } catch (e) {
      showError(e.response?.data?.detail || 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  const handleUpgrade = async (tier) => {
    if (tier === 'free') return;
    setUpgrading(tier);
    try {
      const res = await apiClient.post('/payments/subscribe', { tier });
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (e) {
      showError(e.response?.data?.detail || 'Could not start checkout. Check Stripe configuration.');
    } finally {
      setUpgrading('');
    }
  };

  if (!user) return null;

  const currentTier = plan?.tier || 'free';

  return (
    <>
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">

            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>
                Choose Your Plan
              </h1>
              <p className="text-muted-foreground">
                Flexible therapy plans designed for Pakistan's mental health journey
              </p>
            </div>

            {/* Current plan banner */}
            {!loading && plan && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="font-semibold capitalize">{currentTier}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Sessions Remaining</p>
                  <p className="font-bold text-primary text-lg">{plan.sessions_remaining}</p>
                </div>
                {plan.free_intro_used === false && (
                  <Badge variant="outline" className="border-green-500 text-green-600">
                    Free Intro Available
                  </Badge>
                )}
              </div>
            )}

            {/* Pricing cards */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PLANS.map((p) => {
                  const Icon = p.icon;
                  const isCurrent = p.tier === currentTier;
                  const isDowngrade = PLANS.findIndex(x => x.tier === p.tier) <
                                      PLANS.findIndex(x => x.tier === currentTier);

                  return (
                    <Card
                      key={p.tier}
                      className={`relative flex flex-col border-2 transition-all ${
                        isCurrent ? 'border-primary shadow-md' : p.border
                      }`}
                    >
                      {p.badge && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground px-3">{p.badge}</Badge>
                        </div>
                      )}
                      {isCurrent && (
                        <div className="absolute -top-3 right-4">
                          <Badge variant="outline" className="border-primary text-primary bg-background">
                            Current
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-2`}>
                          <Icon className={`h-5 w-5 ${p.color}`} />
                        </div>
                        <CardTitle className="text-lg">{p.name}</CardTitle>
                        <div className="mt-1">
                          {p.price === 0 ? (
                            <span className="text-2xl font-bold">Free</span>
                          ) : (
                            <>
                              <span className="text-2xl font-bold">{formatPKR(p.price)}</span>
                              <span className="text-sm text-muted-foreground">/month</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-1 gap-4">
                        <ul className="space-y-2 flex-1">
                          {p.features.map((f) => (
                            <li key={f} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                        {p.tier === 'free' ? (
                          <Button variant="outline" disabled className="w-full">
                            {isCurrent ? 'Current Plan' : 'Free'}
                          </Button>
                        ) : isCurrent ? (
                          <Button variant="outline" disabled className="w-full">Active Plan</Button>
                        ) : isDowngrade ? (
                          <Button variant="ghost" disabled className="w-full text-muted-foreground">
                            Downgrade
                          </Button>
                        ) : (
                          <Button
                            className="w-full bg-primary hover:bg-primary/90"
                            disabled={upgrading === p.tier}
                            onClick={() => handleUpgrade(p.tier)}
                          >
                            {upgrading === p.tier ? (
                              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Redirecting…</>
                            ) : (
                              `Upgrade to ${p.name}`
                            )}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Active subscription management */}
            {!loading && plan && plan.tier !== 'free' && plan.status === 'active' && (
              <Card className="border-primary/20">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold capitalize">Active Plan: {plan.tier}</h3>
                      <p className="text-sm text-muted-foreground">
                        {plan.sessions_remaining} session(s) remaining this month
                      </p>
                    </div>
                    <Badge className="border-green-500 text-green-600 border bg-transparent">Active</Badge>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleManageBilling}
                      disabled={managingBilling}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {managingBilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Manage Billing
                    </button>
                    <button
                      onClick={() => setShowCancelDialog(true)}
                      className="px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors"
                    >
                      Cancel Plan
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pay-per-session note */}
            <Card className="bg-muted/40">
              <CardContent className="p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Pay-Per-Session Rates (PKR)</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2">
                  <span>Dr. Ayesha Khan (CBT)</span><span className="font-medium">PKR 2,800 × duration</span>
                  <span>Dr. Bilal Chaudhry (Anxiety)</span><span className="font-medium">PKR 2,500 × duration</span>
                  <span>Dr. Usman Sheikh (General)</span><span className="font-medium">PKR 2,200 × duration</span>
                  <span>Dr. Sana Mirza (Youth)</span><span className="font-medium">PKR 1,800 × duration</span>
                </div>
                <p className="mt-2 text-xs">Duration multipliers: 15 min × 1.0 · 25 min × 1.6 · 30 min × 2.0</p>
              </CardContent>
            </Card>

            {/* Test card note */}
            <p className="text-center text-xs text-muted-foreground">
              Test card: <code className="font-mono bg-muted px-1 rounded">4242 4242 4242 4242</code> · Any future expiry · Any CVV
            </p>
          </div>
        </div>
      </main>
    </div>

      {/* Cancel confirmation dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Cancel Subscription?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your plan will remain active until the end of the current billing period. After that, you'll revert to the Free plan and lose any unused sessions.
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                  onClick={() => setShowCancelDialog(false)}
                >
                  Keep Plan
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                >
                  {cancelling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Cancel Subscription
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
