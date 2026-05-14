import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ArrowLeft, Lock, Mail, CheckCircle2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import apiClient from '../../apiClient';

export default function LoginV0() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for success message from signup
  useEffect(() => {
    if (location.state?.message) {
      showSuccess(location.state.message);
      // Clean up the location state so it doesn't reappear on reload
      window.history.replaceState({}, document.title);
    }
  }, [location, showSuccess]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password);
      const user = result?.user;
      if (user && !user.onboarding_completed) {
        if (user.role === 'psychiatrist') {
          navigate('/therapist-onboarding');
        } else {
          navigate('/onboarding');
        }
      } else if (user?.role === 'psychiatrist') {
        navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      showError(err.response?.data?.detail || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background gradient accents */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl"></div>
        <div className="absolute bottom-20 left-0 h-96 w-96 rounded-full bg-accent/5 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md">
        {/* Back to home link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        {/* Logo section */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block mb-6 hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="TheraAI" className="h-20 w-auto object-contain mx-auto" />
          </Link>
        </div>

        <Card className="border-border bg-card shadow-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl" style={{ fontFamily: 'Montserrat' }}>
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base">
              Sign in to your TheraAI account and continue your mental health journey.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">

              {/* Email field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-input bg-background"
                />
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-input bg-background"
                />
              </div>

              {/* Sign in button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-base h-11 shadow-md transition-all"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Divider */}
            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Google OAuth button */}
            <div className="mt-4">
              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                <GoogleLogin
                  onSuccess={async ({ credential }) => {
                    try {
                      const res = await apiClient.post('/auth/google', { id_token: credential });
                      loginWithGoogle(res.data.access_token, res.data.user);
                      const user = res.data.user;
                      if (!user.onboarding_completed) {
                        navigate(user.role === 'psychiatrist' ? '/therapist-onboarding' : '/onboarding');
                      } else {
                        navigate('/dashboard');
                      }
                    } catch (err) {
                      showError(err.response?.data?.detail || 'Google sign-in failed. Please try again.');
                    }
                  }}
                  onError={() => showError('Google sign-in failed.')}
                  width="100%"
                  text="continue_with"
                />
              ) : (
                <Button type="button" variant="outline" className="w-full gap-2" disabled title="Google OAuth not configured">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </Button>
              )}
            </div>

            {/* Sign up link */}
            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary hover:underline font-semibold transition-colors">
                  Create one now
                </Link>
              </p>
            </div>

            {/* Terms notice */}
            <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
              By signing in, you agree to our{' '}
              <Link to="#" className="text-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="#" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
