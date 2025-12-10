/**
 * Signup Component - Modern Redesign
 * Simplified registration with only essential fields
 * Consistent with dashboard purple gradient theme
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { Eye, EyeOff, UserPlus, Mail, Lock, User, Shield, Heart, Sparkles, ArrowLeft, Check } from 'lucide-react';
import './Auth.css';

const USER_ROLES = [
  { 
    value: 'patient', 
    label: 'Member', 
    description: 'Track your wellness and get AI support',
    emoji: '🌱'
  },
  { 
    value: 'psychiatrist', 
    label: 'Mental Health Professional', 
    description: 'Provide professional care and support',
    emoji: '👨‍⚕️'
  },
];

function Signup() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const { signup, loading, error, isAuthenticated, clearError } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const validateForm = () => {
    const errors = {};

    // Full name validation
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Must contain uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }

    if (error) {
      clearError();
    }
  };

  const handleRoleSelect = (roleValue) => {
    setFormData(prev => ({
      ...prev,
      role: roleValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const userData = {
      full_name: formData.fullName,
      email: formData.email,
      password: formData.password,
      confirm_password: formData.confirmPassword,
      role: formData.role,
      is_active: true
    };

    const result = await signup(userData);
    
    if (result.success) {
      showSuccess(result.message || 'Account created successfully!');
      if (result.requiresLogin) {
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }
    } else {
      showError(result.error || 'Registration failed. Please try again.');
    }
  };

  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
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
        <div className="auth-card signup-card">
          {/* Header */}
          <div className="auth-header">
            <div className="logo-wrapper">
              <div className="logo-icon">
                <Heart size={32} />
              </div>
              <Sparkles className="sparkle-icon sparkle-1" size={16} />
              <Sparkles className="sparkle-icon sparkle-2" size={12} />
            </div>
            <h1 className="auth-title">Join TheraAI</h1>
            <p className="auth-subtitle">Start your wellness journey today</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="error-banner">
                <div className="error-icon">!</div>
                <p>{error}</p>
              </div>
            )}

            {/* Role Selection */}
            <div className="form-group">
              <label className="form-label">
                <Shield size={16} />
                <span>Account Type</span>
              </label>
              <div className="role-selector">
                {USER_ROLES.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    className={cn(
                      "role-card",
                      formData.role === role.value && "role-card-active"
                    )}
                    onClick={() => handleRoleSelect(role.value)}
                  >
                    <div className="role-check">
                      {formData.role === role.value && <Check size={16} />}
                    </div>
                    <div className="role-emoji">{role.emoji}</div>
                    <div className="role-info">
                      <div className="role-label">{role.label}</div>
                      <div className="role-description">{role.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Full Name Field */}
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">
                <User size={16} />
                <span>Full Name</span>
              </label>
              <Input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="John Doe"
                className={cn("form-input", validationErrors.fullName && "input-error")}
              />
              {validationErrors.fullName && (
                <p className="error-text">{validationErrors.fullName}</p>
              )}
            </div>

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
                className={cn("form-input", validationErrors.email && "input-error")}
              />
              {validationErrors.email && (
                <p className="error-text">{validationErrors.email}</p>
              )}
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
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className={cn("form-input", validationErrors.password && "input-error")}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('password')}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="error-text">{validationErrors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                <Lock size={16} />
                <span>Confirm Password</span>
              </label>
              <div className="password-field">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  className={cn("form-input", validationErrors.confirmPassword && "input-error")}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="password-toggle"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="error-text">{validationErrors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="submit-button"
            >
              {loading ? (
                <div className="button-loading">
                  <div className="spinner" />
                  <span>Creating Account...</span>
                </div>
              ) : (
                <>
                  <UserPlus size={20} />
                  <span>Create Account</span>
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="auth-footer">
            <p className="footer-text">
              Already have an account?{' '}
              <Link to="/login" className="footer-link">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Features Preview */}
        <div className="features-preview">
          <div className="feature-item">
            <div className="feature-icon">🎯</div>
            <span>Set Goals</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📈</div>
            <span>Track Progress</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🤖</div>
            <span>AI Support</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🏆</div>
            <span>Earn Rewards</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
