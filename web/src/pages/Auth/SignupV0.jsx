import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ArrowLeft, Lock, Mail, CheckCircle2, User, Briefcase, Heart } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import apiClient from '../../apiClient';

export default function SignupV0() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { signup, loginWithGoogle } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      showError('Password must be at least 8 characters');
      return;
    }
    if (!agreeToTerms) {
      showError('Please agree to the terms and privacy policy');
      return;
    }
    if (!selectedRole) {
      showError('Please select your role');
      return;
    }

    setIsLoading(true);
    try {
      const userData = {
        full_name: fullName,
        email: email,
        password: password,
        confirm_password: confirmPassword,
        role: selectedRole,
        is_active: true
      };
      
      const result = await signup(userData);
      
      if (result.success) {
        showSuccess('Account created successfully! Welcome to TheraAI!');
        // Auto-logged in — go straight to role-specific onboarding
        if (selectedRole === 'psychiatrist') {
          navigate('/therapist-onboarding');
        } else {
          navigate('/onboarding');
        }
      } else {
        showError(result.error || 'Signup failed. Please try again.');
      }
    } catch (err) {
      showError(err.response?.data?.detail || err.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordMatch = password === confirmPassword && password.length > 0;
  const passwordLength = password.length >= 8;
  const isFormValid = email && fullName && password && confirmPassword && selectedRole && agreeToTerms;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl"></div>
        <div className="absolute bottom-20 left-0 h-96 w-96 rounded-full bg-accent/5 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="mb-8 text-center">
          <Link to="/" className="inline-block mb-6 hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="TheraAI" className="h-20 w-auto object-contain mx-auto" />
          </Link>
        </div>

        <Card className="border-border bg-card shadow-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl" style={{ fontFamily: 'Montserrat' }}>
              Create Your Account
            </CardTitle>
            <CardDescription className="text-base">
              Join TheraAI and start your mental health journey today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">

              {/* Name field */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="border-input bg-background"
                />
              </div>

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
                <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-input bg-background"
                />
                <p className="text-xs text-muted-foreground">Minimum 8 characters for security</p>
              </div>

              {/* Confirm password field */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="border-input bg-background pr-10"
                  />
                  {passwordMatch && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                  )}
                </div>
              </div>

              {/* Role selection */}
              <div className="space-y-3 pt-2">
                <label className="text-sm font-medium">Select Your Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('patient')}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      selectedRole === 'patient'
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <Heart className="h-5 w-5" />
                    <span className="text-sm font-medium">Member</span>
                    <span className="text-xs text-muted-foreground">Get support</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('psychiatrist')}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      selectedRole === 'psychiatrist'
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <Briefcase className="h-5 w-5" />
                    <span className="text-sm font-medium">Therapist</span>
                    <span className="text-xs text-muted-foreground">Provide care</span>
                  </button>
                </div>
              </div>

              {/* Terms agreement */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border bg-background"
                  />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    I agree to TheraAI's{' '}
                    <Link to="#" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="#" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
              </div>

              {/* Create account button */}
              <Button
                type="submit"
                disabled={isLoading || !isFormValid || !passwordLength}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-base h-11 shadow-md transition-all"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Google sign-up (always creates a patient account) */}
            <div className="mt-4">
              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                <GoogleLogin
                  onSuccess={async ({ credential }) => {
                    try {
                      const res = await apiClient.post('/auth/google', { id_token: credential });
                      loginWithGoogle(res.data.access_token, res.data.user);
                      const user = res.data.user;
                      navigate(user.onboarding_completed ? '/dashboard' : '/onboarding');
                    } catch (err) {
                      showError(err.response?.data?.detail || 'Google sign-in failed. Please try again.');
                    }
                  }}
                  onError={() => showError('Google sign-in failed.')}
                  width="100%"
                  text="signup_with"
                />
              ) : null}
            </div>

            <div className="mt-4 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-semibold transition-colors">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
          <p className="text-xs text-muted-foreground">
            Your data is encrypted with enterprise-grade security. We take your privacy seriously.
          </p>
        </div>
      </div>
    </main>
  );
}
