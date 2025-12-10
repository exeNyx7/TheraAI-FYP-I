/**
 * Login Component - Modern Redesign
 * Consistent with dashboard purple gradient theme
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { LogIn, Mail, Lock, Eye, EyeOff, Heart, Sparkles, ArrowLeft } from 'lucide-react';
import './Auth.css';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const { login, loading, error, isAuthenticated, clearError } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Clear error when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      showError('Please fill in all required fields');
      return;
    }

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      showSuccess(result.message || 'Welcome back!');
    } else {
      showError(result.error || 'Login failed. Please try again.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="auth-container">
      {/* Background Elements */}
      <div className="auth-background">
        <div className="gradient-blob blob-1"></div>
        <div className="gradient-blob blob-2"></div>
        <div className="gradient-blob blob-3"></div>
      </div>

      <div className="auth-content">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="back-to-landing"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </Button>

        {/* Auth Card */}
        <div className="auth-card">
          {/* Header */}
          <div className="auth-header">
            <div className="logo-wrapper">
              <div className="logo-icon">
                <Heart size={32} />
              </div>
              <Sparkles className="sparkle-icon sparkle-1" size={16} />
              <Sparkles className="sparkle-icon sparkle-2" size={12} />
            </div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Continue your wellness journey with TheraAI</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="error-banner">
                <div className="error-icon">!</div>
                <p>{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <Mail size={16} />
                <span>Email Address</span>
              </label>
              <Input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className={cn("form-input", error && "input-error")}
              />
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <Lock size={16} />
                <span>Password</span>
              </label>
              <div className="password-field">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={cn("form-input", error && "input-error")}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !formData.email || !formData.password}
              className="submit-button"
            >
              {loading ? (
                <div className="button-loading">
                  <div className="spinner" />
                  <span>Signing In...</span>
                </div>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Sign In</span>
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="auth-footer">
            <p className="footer-text">
              Don't have an account?{' '}
              <Link to="/signup" className="footer-link">
                Sign up here
              </Link>
            </p>
          </div>
        </div>

        {/* Features Preview */}
        <div className="features-preview">
          <div className="feature-item">
            <div className="feature-icon">📝</div>
            <span>Daily Journaling</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon">😊</div>
            <span>Mood Tracking</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon">💬</div>
            <span>AI Companion</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <span>Progress Insights</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
