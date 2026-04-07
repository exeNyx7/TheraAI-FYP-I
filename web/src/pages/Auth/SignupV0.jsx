import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ArrowLeft, Lock, Mail, CheckCircle2, User, Briefcase, Heart } from 'lucide-react';

export default function SignupV0() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { signup } = useAuth();
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
        showSuccess('Account created successfully!');
        if (result.requiresLogin) {
          navigate('/login', { 
            state: { message: 'Account created successfully! Please log in.' }
          });
        } else {
          navigate(selectedRole === 'patient' ? '/onboarding' : '/dashboard');
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
          <Link to="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <span className="text-base font-bold text-primary-foreground">T</span>
            </div>
            <span className="text-2xl font-semibold" style={{ fontFamily: 'Montserrat' }}>
              Thera-AI
            </span>
          </Link>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl" style={{ fontFamily: 'Montserrat' }}>
              Create Your Account
            </CardTitle>
            <CardDescription className="text-base">
              Join Thera-AI and start your mental health journey today.
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
                  className="bg-background/50 border-border/50 focus:border-primary transition-colors"
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
                  className="bg-background/50 border-border/50 focus:border-primary transition-colors"
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
                  className="bg-background/50 border-border/50 focus:border-primary transition-colors"
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
                    className="bg-background/50 border-border/50 focus:border-primary transition-colors pr-10"
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
                    I agree to Thera-AI's{' '}
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
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Google OAuth button */}
            <Button
              type="button"
              variant="outline"
              className="w-full mt-4 gap-2"
              onClick={() => { window.location.href = '/api/v1/auth/google'; }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <div className="mt-6 text-center text-sm">
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
